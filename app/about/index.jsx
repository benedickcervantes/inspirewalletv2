import React, { useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useRouter, useNavigation } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

export default function Index() {
  const navigation = useNavigation();
  const router = useRouter();

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#E25A17" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>About Inspire</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Our Company Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="office-building" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.sectionTitle}>Our Company</Text>
            </View>
            <Text style={styles.sectionText}>
              At Inspire Alliance Fund Group Inc., we are driven by a powerful purpose: to empower dreams and ignite meaningful change. Founded on the belief that lasting progress begins with opportunity, we exist to support individuals and communities who are ready to make a difference—not just in their own lives, but in the communities around them. We are a financial funding. We are a dynamic movement that bridges passionate visionaries with the support, trust, and resources they need to transform ideas into lasting impact.
            </Text>
          </View>

          {/* Our Mission Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="flag" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.sectionTitle}>Our Mission</Text>
            </View>
            <Text style={styles.sectionText}>
              At Inspire Alliance Fund Group Inc., our mission is to ignite change by empowering dreams. We believe that real progress begins when people are given the resources, trust, and opportunities to build a better future not just for themselves, but for their communities and beyond. We are more than a funding platform, we are a movement that connects purpose-driven people with the support they need to turn ideas into impact. By investing in human potential, we cultivate a ripple effect: supporting lives, strengthening economies, and shaping a future where hope and innovation thrive together.
            </Text>
          </View>

          {/* Inspire Wallet Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="wallet" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.sectionTitle}>Inspire Wallet</Text>
            </View>
            <Text style={styles.sectionText}>
              Inspire Wallet, our flagship app for Inspire Investors, embodies this vision. Designed as your all-in-one financial companion, Inspire Wallet allows you to:
            </Text>

            {/* Bullet Points */}
            <View style={styles.bulletContainer}>
              <View style={styles.bulletItem}>
                <View style={styles.checkCircle}>
                  <Ionicons name="checkmark" size={16} color="#E25A17" />
                </View>
                <Text style={styles.bulletText}>Stay on top of your investments</Text>
              </View>

              <View style={styles.bulletItem}>
                <View style={styles.checkCircle}>
                  <Ionicons name="checkmark" size={16} color="#E25A17" />
                </View>
                <Text style={styles.bulletText}>Manage stocks</Text>
              </View>

              <View style={styles.bulletItem}>
                <View style={styles.checkCircle}>
                  <Ionicons name="checkmark" size={16} color="#E25A17" />
                </View>
                <Text style={styles.bulletText}>Track withdrawals</Text>
              </View>

              <View style={styles.bulletItem}>
                <View style={styles.checkCircle}>
                  <Ionicons name="checkmark" size={16} color="#E25A17" />
                </View>
                <Text style={styles.bulletText}>Keep a clear record of all your financial transactions</Text>
              </View>
            </View>

            <View style={styles.noteContainer}>
              <Text style={styles.noteText}>
                Whether you're a seasoned investor or just getting started, our app provides all the tools you need to manage your portfolio with ease and confidence.
              </Text>
            </View>
          </View>

          {/* Call to Action Card */}
          <LinearGradient
            colors={["#E25A17", "#F28934"]}
            style={styles.ctaCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.ctaIconContainer}>
              <MaterialCommunityIcons name="rocket-launch" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.ctaTitle}>Ready to Get Started?</Text>
            <Text style={styles.ctaText}>
              Join us at Inspire Alliance Fund Group Incorporated and together, let's shape a prosperous future. Take control of your financial journey now!
            </Text>
          </LinearGradient>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </SafeAreaView>
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
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
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
    color: "#333",
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#E25A17",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    flex: 1,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#666",
    textAlign: "justify",
  },
  bulletContainer: {
    marginTop: 16,
  },
  bulletItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFF5F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: "#666",
  },
  noteContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#FFF5F0",
    borderLeftWidth: 3,
    borderLeftColor: "#E25A17",
    borderRadius: 8,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 20,
    color: "#666",
    fontStyle: "italic",
  },
  ctaCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  ctaIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 12,
    textAlign: "center",
  },
  ctaText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#FFFFFF",
    textAlign: "center",
    opacity: 0.95,
  },
  bottomPadding: {
    height: 20,
  },
});
