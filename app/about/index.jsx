import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ImageBackground,
  SafeAreaView,
  ScrollView,
  Platform,
} from "react-native";
import { useNavigation } from "expo-router";
import { Colors } from "../../constants/Colors";
import userService from "../../services/userService";
import { t } from "../../utils/languageUtils";
import { getRTLStyles } from "../../utils/rtlUtils";
import { Ionicons } from "@expo/vector-icons";

export default function Index() {
  const navigation = useNavigation();
  const [userLanguage, setUserLanguage] = useState('English');

  useEffect(() => {
    fetchUserLanguage();
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: true,
      headerTitle: t(userLanguage, 'about.header.title'),
      headerTintColor: Colors.redTheme.background,
      headerTitleStyle: {
        fontWeight: "bold",
        fontSize: 18,
      },
    });
  }, [navigation, userLanguage]);

  const fetchUserLanguage = async () => {
    try {
      const profile = await userService.getUserProfile();
      setUserLanguage(profile?.preferredLanguage || 'English');
    } catch (error) {
      console.error("Error fetching user language:", error);
    }
  };

  const sections = [
    {
      id: 'ourCompany',
      title: t(userLanguage, 'about.content.ourCompany.title'),
      icon: 'business-outline',
      content: t(userLanguage, 'about.content.ourCompany.content')
    },
    {
      id: 'ourMission',
      title: t(userLanguage, 'about.content.ourMission.title'),
      icon: 'flag-outline',
      content: t(userLanguage, 'about.content.ourMission.content')
    },
    {
      id: 'inspireWallet',
      title: t(userLanguage, 'about.content.inspireWallet.title'),
      icon: 'wallet-outline',
      content: t(userLanguage, 'about.content.inspireWallet.content'),
      bulletPoints: [
        t(userLanguage, 'about.content.inspireWallet.bulletPoints.investments'),
        t(userLanguage, 'about.content.inspireWallet.bulletPoints.stocks'),
        t(userLanguage, 'about.content.inspireWallet.bulletPoints.withdrawals'),
        t(userLanguage, 'about.content.inspireWallet.bulletPoints.transactions')
      ],
      conclusion: t(userLanguage, 'about.content.inspireWallet.conclusion')
    }
  ];

  const renderSection = (section) => (
    <View key={section.id} style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconContainer}>
          <Ionicons name={section.icon} size={24} color={Colors.redTheme.background} />
        </View>
        <Text style={[styles.sectionTitle, getRTLStyles(userLanguage)]}>
          {section.title}
        </Text>
      </View>
      
      <Text style={[styles.sectionContent, getRTLStyles(userLanguage)]}>
        {section.content}
      </Text>

      {section.bulletPoints && (
        <View style={styles.bulletPointsContainer}>
          {section.bulletPoints.map((point, index) => (
            <View key={index} style={styles.bulletPoint}>
              <View style={styles.bulletIcon}>
                <Ionicons name="checkmark" size={12} color={Colors.redTheme.background} />
              </View>
              <Text style={[styles.bulletText, getRTLStyles(userLanguage)]}>
                {point}
              </Text>
            </View>
          ))}
        </View>
      )}

      {section.conclusion && (
        <Text style={[styles.conclusionText, getRTLStyles(userLanguage)]}>
          {section.conclusion}
        </Text>
      )}
    </View>
  );

  return (
    <ImageBackground
      source={require("../../assets/images/bg2.png")}
      style={styles.container}
    >
      <SafeAreaView style={styles.androidSafeArea}>
        <ScrollView 
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <View style={styles.heroCard}>
            <View style={styles.heroIconContainer}>
              <Ionicons name="information-circle" size={48} color="white" />
            </View>
            <Text style={[styles.heroTitle, getRTLStyles(userLanguage)]}>
              {t(userLanguage, 'about.header.title')}
            </Text>
            <Text style={[styles.heroSubtitle, getRTLStyles(userLanguage)]}>
              Learn more about Inspire Wallet and our mission
            </Text>
          </View>

          {/* Content Sections */}
          <View style={styles.contentContainer}>
            {sections.map(renderSection)}
          </View>

          {/* Call to Action Card */}
          <View style={styles.ctaCard}>
            <View style={styles.ctaHeader}>
              <Ionicons name="rocket-outline" size={24} color={Colors.redTheme.background} />
              <Text style={[styles.ctaTitle, getRTLStyles(userLanguage)]}>
                Ready to Get Started?
              </Text>
            </View>
            <Text style={[styles.ctaText, getRTLStyles(userLanguage)]}>
              {t(userLanguage, 'about.content.callToAction')}
            </Text>
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  androidSafeArea: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? 60 : 50,
  },
  scrollViewContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Hero Card - Modern e-wallet style
  heroCard: {
    backgroundColor: Colors.redTheme.background,
    borderRadius: 24,
    padding: 32,
    marginBottom: 24,
    alignItems: "center",
    shadowColor: Colors.redTheme.background,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  heroIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    lineHeight: 20,
  },

  // Content Container
  contentContainer: {
    gap: 16,
  },

  // Section Cards
  sectionCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: Colors.redTheme.background,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(254, 125, 72, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    flex: 1,
  },
  sectionContent: {
    fontSize: 15,
    lineHeight: 22,
    color: "#333",
    marginBottom: 12,
  },

  // Bullet Points
  bulletPointsContainer: {
    marginTop: 8,
  },
  bulletPoint: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  bulletIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(254, 125, 72, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: "#555",
  },

  // Conclusion Text
  conclusionText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#333",
    marginTop: 12,
    fontStyle: "italic",
  },

  // Call to Action Card
  ctaCard: {
    backgroundColor: "rgba(254, 125, 72, 0.05)",
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(254, 125, 72, 0.2)",
    alignItems: "center",
  },
  ctaHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.redTheme.background,
    marginLeft: 12,
  },
  ctaText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#333",
    textAlign: "center",
    fontWeight: "500",
  },

  // Spacing
  bottomSpacing: {
    height: 40,
  },
});
